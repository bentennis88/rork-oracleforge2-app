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
          // Subtle shadow for depth
          shadowColor: colors.shadowColor,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600' as const,
          letterSpacing: 0.3,
        },
        headerStyle: {
          backgroundColor: colors.surface,
          // Subtle shadow
          shadowColor: colors.shadowColor,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 4,
        },
        headerTitleStyle: {
          color: colors.text,
          fontSize: 18,
          fontWeight: '600' as const,
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
