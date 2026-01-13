import { Tabs } from "expo-router";
import { LayoutGrid, Plus, User } from "lucide-react-native";
import React from "react";
import { Platform } from "react-native";
import colors from "@/constants/colors";
// NOTE: We intentionally do NOT wrap Tabs with OraclesProvider here because the app is already
// wrapped at the root (`app/_layout.tsx`). Double-wrapping would create a second store instance.

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500' as const,
          letterSpacing: 0.5,
        },
        headerStyle: {
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.surfaceBorder,
        },
        headerTitleStyle: {
          color: colors.text,
          fontSize: 16,
          fontWeight: '600' as const,
          letterSpacing: 1,
        },
        headerTintColor: colors.text,
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => <LayoutGrid size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="createOracle"
        options={{
          title: "Create",
          tabBarIcon: ({ color, size }) => <Plus size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
